import { Meteor } from "meteor/meteor";
import React, { Component } from "react";
import PropTypes from "prop-types";
import _ from "lodash";
import { Components, registerComponent } from "@reactioncommerce/reaction-components";
import ReactionAlerts from "/imports/plugins/core/layout/client/templates/layout/alerts/inlineAlerts";
import { Reaction, i18next } from "/client/api";
import Card from "@material-ui/core/Card";
import CardContent from "@material-ui/core/CardContent";
import CardHeader from "@material-ui/core/CardHeader";
import { getDefaultUserInviteGroup, getUserByEmail } from "../helpers/accountsHelper";

class AdminInviteForm extends Component {
  static propTypes = {
    canInviteToGroup: PropTypes.func,
    groups: PropTypes.array
  };

  constructor(props) {
    super(props);
    const { groups } = props;

    this.state = {
      alertId: "admin-invite-form",
      groups,
      name: "",
      email: "",
      group: getDefaultUserInviteGroup(groups)
    };

    this.onChange = this.onChange.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
  }

  // eslint-disable-next-line camelcase
  UNSAFE_componentWillReceiveProps(nextProps) {
    const { groups } = nextProps;
    this.setState({ groups, group: getDefaultUserInviteGroup(groups) });
  }

  onChange(event) {
    this.setState({ [event.target.name]: event.target.value });
  }

  handleGroupSelect = (event, group) => {
    this.setState({ group });
  };

  removeAlert = (oldAlert) => this.setState({
    alertArray: this.state.alertArray.filter((alert) => !_.isEqual(alert, oldAlert))
  });

  sendInvitation = (options) => Meteor.call("accounts/inviteShopMember", options, (error, result) => {
    if (error) {
      let messageKey;
      // switching to use of package i18n keys (groupsInvite. namespace)
      if (error.reason === "Unable to send invitation email.") {
        messageKey = "admin.groupsInvite.unableToSendInvitationEmail";
      } else if (error.reason === "cannot directly invite owner") {
        messageKey = "admin.groupsInvite.inviteOwnerError";
      } else if (error.reason === "cannot invite to group") {
        messageKey = "admin.groupsInvite.cannotInvite";
      } else if (error.reason === "Need to set a username or email") {
        messageKey = "admin.groupsInvite.NeedToSetUsernameOrEmail";
      } else {
        messageKey = "admin.groupsInvite.errorSendingInvite";
      }

      const { alertId } = this.state;
      const alertOptions = { placement: alertId, id: alertId, autoHide: 4000 };

      ReactionAlerts.add(error.reason, "danger", Object.assign({}, alertOptions, { i18nKey: messageKey }));
    }

    if (result) {
      this.setState({ name: "", email: "" });
      Alerts.toast(i18next.t("accountsUI.info.invitationSent"), "success");
    }
  });

  handleSubmit(event) {
    event.preventDefault();
    const { name, email, group, alertId } = this.state;
    const alertOptions = { placement: alertId, id: alertId, autoHide: 4000 };

    // if no group is selected, show alert that group is required to send invitation
    if (!group._id) {
      return ReactionAlerts.add(
        "A group is required to invite an admin",
        "danger",
        Object.assign({}, alertOptions, { i18nKey: "admin.groupsInvite.groupRequired" })
      );
    }

    const matchingAccount = getUserByEmail(email);
    const matchingEmail = matchingAccount &&
      matchingAccount.emails &&
      matchingAccount.emails.find((emailObject) => emailObject.address === email);

    const isEmailVerified = matchingEmail && matchingEmail.verified;

    const options = { email, name, shopId: Reaction.getShopId(), groupId: group._id };

    if (matchingAccount) {
      return Alerts.alert({
        title: i18next.t(`accountsUI.error.${isEmailVerified ? "userWithEmailAlreadyExists" : "inviteAlreadyPending"}`),
        text: i18next.t(`accountsUI.${isEmailVerified ? "promoteExistingAccountConfirm" : "sendNewInviteConfirm"}`),
        type: "warning",
        showCancelButton: true,
        showCloseButton: true,
        confirmButtonColor: "#98afbc",
        cancelButtonColor: "#98afbc",
        confirmButtonText: i18next.t("accountsUI.yes"),
        cancelButtonText: i18next.t("app.cancel")
      }, (isConfirm) => {
        if (isConfirm) {
          this.sendInvitation(options);
        }
      });
    }

    return this.sendInvitation(options);
  }

  renderDropDownButton() {
    const { group } = this.state;

    if (!group._id) {
      return null;
    }
    const buttonElement = (opt) => (
      <Components.Button bezelStyle="solid" label={group.name && _.startCase(group.name)} >
        &nbsp;
        {opt && opt.length && // add icon only if there's a list of options
        <i className="fa fa-chevron-down" />
        }
      </Components.Button>
    );

    // current selected option and "owner" should not show in list options
    const dropOptions = this.state.groups.filter((grp) => grp._id !== group._id);
    if (!dropOptions.length) { return buttonElement(); } // do not use dropdown if only one option

    return (
      <Components.DropDownMenu
        buttonElement={buttonElement(dropOptions)}
        onChange={this.handleGroupSelect}
        attachment="top right"
        targetAttachment="bottom right"
      >
        {dropOptions
          .map((grp, index) => (
            <Components.MenuItem
              key={index}
              label={_.startCase(grp.name)}
              selectLabel={_.startCase(grp.name)}
              value={grp}
            />
          ))}
      </Components.DropDownMenu>
    );
  }

  renderForm() {
    return (
      <div className="admin-invite-form">
        <Components.Alerts placement={this.state.alertId} id={this.state.alertId} onAlertRemove={this.removeAlert} />
        <div className="panel-body">
          <form className="">
            <div className="form-group">
              <Components.TextField
                i18nKeyLabel="accountsUI.name"
                label="Name"
                name="name"
                id="member-form-name"
                type="text"
                i18nKeyPlaceholder="admin.groupsInvite.name"
                value={this.state.name}
                onChange={this.onChange}
              />
            </div>
            <div className="form-group">
              <Components.TextField
                i18nKeyLabel="accountsUI.email"
                label="Email"
                name="email"
                id="member-form-email"
                type="text"
                i18nKeyPlaceholder="admin.groupsInvite.email"
                value={this.state.email}
                onChange={this.onChange}
              />
            </div>
            <div className="form-group action-select">
              {this.renderDropDownButton()}
              <div className="form-btns add-admin justify">
                <Components.Button
                  status="primary"
                  buttonType="submit"
                  onClick={this.handleSubmit}
                  bezelStyle="solid"
                  i18nKeyLabel="accountsUI.info.sendInvitation"
                  label="Send Invitation"
                />
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  render() {
    return (
      <Card elevation={0}>
        <CardHeader
          data-i18n="accountsUI.info.addAdminUser"
          title={i18next.t("accountsUI.info.addAdminUser", { defaultValue: "Add Admin User" })}
        />
        <CardContent>
          {this.renderForm()}
        </CardContent>
      </Card>
    );
  }
}

registerComponent("AdminInviteForm", AdminInviteForm);

export default AdminInviteForm;
